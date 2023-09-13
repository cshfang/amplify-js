// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify, Hub, defaultStorage, OAuthConfig } from '@aws-amplify/core';
import {
	AMPLIFY_SYMBOL,
	assertOAuthConfig,
	assertTokenProviderConfig,
	getAmplifyUserAgent,
	urlSafeEncode,
	USER_AGENT_HEADER,
} from '@aws-amplify/core/internals/utils';
import { SignInWithRedirectRequest } from '../../../types/requests';
import { cacheCognitoTokens } from '../tokenProvider/cacheTokens';
import { CognitoUserPoolsTokenProvider } from '../tokenProvider';
import {
	generateChallenge,
	generateRandom,
	generateState,
} from '../utils/signInWithRedirectHelpers';
import { cognitoHostedUIIdentityProviderMap } from '../types/models';
import { DefaultOAuthStore } from '../utils/signInWithRedirectStore';
import { AuthError } from '../../../errors/AuthError';
import { AuthErrorTypes } from '../../../types';
import { AuthErrorCodes } from '../../../common/AuthErrorStrings';
import { authErrorMessages } from '../../../Errors';
import { openAuthSession } from '../../../utils';

/**
 * Signs in a user with OAuth. Redirects the application to an Identity Provider.
 *
 * @param signInRedirectRequest - The SignInRedirectRequest object, if empty it will redirect to Cognito HostedUI
 *
 * TODO: add config errors
 */
export const signInWithRedirect = async (
	signInWithRedirectRequest?: SignInWithRedirectRequest
): Promise<void> => {
	const authConfig = Amplify.getConfig().Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	assertOAuthConfig(authConfig);
	store.setAuthConfig(authConfig);
	let provider = 'COGNITO'; // Default

	if (typeof signInWithRedirectRequest?.provider === 'string') {
		provider =
			cognitoHostedUIIdentityProviderMap[signInWithRedirectRequest.provider];
	} else if (signInWithRedirectRequest?.provider?.custom) {
		provider = signInWithRedirectRequest.provider.custom;
	}

	return oauthSignIn({
		oauthConfig: authConfig.loginWith.oauth,
		clientId: authConfig.userPoolClientId,
		provider,
		customState: signInWithRedirectRequest?.customState,
	});
};

const store = new DefaultOAuthStore(defaultStorage);

export const oauthSignIn = async ({
	oauthConfig,
	provider,
	clientId,
	customState,
}: {
	oauthConfig: OAuthConfig;
	provider: string;
	clientId: string;
	customState?: string;
}) => {
	const { domain, redirectSignIn, responseType, scopes } = oauthConfig;
	const generatedState = generateState(32);

	/* encodeURIComponent is not URL safe, use urlSafeEncode instead. Cognito 
	single-encodes/decodes url on first sign in and double-encodes/decodes url
	when user already signed in. Using encodeURIComponent, Base32, Base64 add 
	characters % or = which on further encoding becomes unsafe. '=' create issue 
	for parsing query params. 
	Refer: https://github.com/aws-amplify/amplify-js/issues/5218 */
	const state = customState
		? `${generatedState}-${urlSafeEncode(customState)}`
		: generatedState;

	store.storeOAuthInFlight(true);
	store.storeOAuthState(state);

	const pkce_key = generateRandom(128);
	store.storePKCE(pkce_key);

	const code_challenge = generateChallenge(pkce_key);
	const code_challenge_method = 'S256';

	const scopesString = scopes.join(' ');

	const queryString = Object.entries({
		redirect_uri: redirectSignIn[0], // TODO(v6): add logic to identity the correct url
		response_type: responseType,
		client_id: clientId,
		identity_provider: provider,
		scope: scopesString,
		state,
		...(responseType === 'code'
			? { code_challenge, code_challenge_method }
			: {}),
	})
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
		.join('&');

	// TODO(v6): use URL object instead
	const oAuthUrl = `https://${domain}/oauth2/authorize?${queryString}`;
	const { type, url } = (await openAuthSession(oAuthUrl, redirectSignIn)) ?? {};
	if (type === 'success' && url) {
		handleAuthResponse({
			currentUrl: url,
			clientId,
			domain,
			redirectUri: redirectSignIn[0],
			responseType,
			userAgentValue: getAmplifyUserAgent(),
		});
	}
};

async function handleCodeFlow({
	currentUrl,
	userAgentValue,
	clientId,
	redirectUri,
	domain,
}: {
	currentUrl: string;
	userAgentValue: string;
	clientId: string;
	redirectUri: string;
	domain: string;
}) {
	/* Convert URL into an object with parameters as keys
{ redirect_uri: 'http://localhost:3000/', response_type: 'code', ...} */
	const url = new URL(currentUrl);
	try {
		await validateStateFromURL(url);
	} catch (err) {
		invokeAndClearPromise();
		// clear temp values
		await store.clearOAuthInflightData();
		return;
	}
	const code = url.searchParams.get('code');

	const currentUrlPathname = url.pathname || '/';
	const redirectUriPathname = new URL(redirectUri).pathname || '/';

	if (!code || currentUrlPathname !== redirectUriPathname) {
		return;
	}

	const oAuthTokenEndpoint = 'https://' + domain + '/oauth2/token';

	// TODO(v6): check hub events
	// dispatchAuthEvent(
	// 	'codeFlow',
	// 	{},
	// 	`Retrieving tokens from ${oAuthTokenEndpoint}`
	// );

	const code_verifier = await store.loadPKCE();

	const oAuthTokenBody = {
		grant_type: 'authorization_code',
		code,
		client_id: clientId,
		redirect_uri: redirectUri,
		...(code_verifier ? { code_verifier } : {}),
	};

	const body = Object.entries(oAuthTokenBody)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
		.join('&');

	const {
		access_token,
		refresh_token,
		id_token,
		error,
		token_type,
		expires_in,
	} = await (
		await fetch(oAuthTokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				[USER_AGENT_HEADER]: userAgentValue,
			},
			body,
		})
	).json();

	if (error) {
		invokeAndClearPromise();

		Hub.dispatch(
			'auth',
			{ event: 'signInWithRedirect_failure' },
			'Auth',
			AMPLIFY_SYMBOL
		);
		throw new AuthError({
			message: error,
			name: AuthErrorCodes.OAuthSignInError,
			recoverySuggestion: authErrorMessages.oauthSignInError.log,
		});
	}

	await store.clearOAuthInflightData();

	await cacheCognitoTokens({
		AccessToken: access_token,
		IdToken: id_token,
		RefreshToken: refresh_token,
		TokenType: token_type,
		ExpiresIn: expires_in,
	});

	await store.storeOAuthSignIn(true);

	Hub.dispatch('auth', { event: 'signInWithRedirect' }, 'Auth', AMPLIFY_SYMBOL);
	invokeAndClearPromise();
	return;
}

async function handleImplicitFlow({ currentUrl }: { currentUrl: string }) {
	const url = new URL(currentUrl);
	const { id_token, access_token, state, token_type, expires_in } =
		// hash is `null` if `#` doesn't exist on URL
		(url.hash || '#')
			.substring(1) // Remove # from returned code
			.split('&')
			.map(pairings => pairings.split('='))
			.reduce((accum, [k, v]) => ({ ...accum, [k]: v }), {
				id_token: undefined,
				access_token: undefined,
				state: undefined,
				token_type: undefined,
				expires_in: undefined,
			});

	await store.clearOAuthInflightData();
	try {
		await validateState(state);
	} catch (error) {
		invokeAndClearPromise();
		return;
	}

	await cacheCognitoTokens({
		AccessToken: access_token,
		IdToken: id_token,
		TokenType: token_type,
		ExpiresIn: expires_in,
	});

	await store.storeOAuthSignIn(true);
	Hub.dispatch('auth', { event: 'signInWithRedirect' }, 'Auth', AMPLIFY_SYMBOL);

	invokeAndClearPromise();
}

async function handleAuthResponse({
	currentUrl,
	userAgentValue,
	clientId,
	redirectUri,
	responseType,
	domain,
}: {
	currentUrl: string;
	userAgentValue: string;
	clientId: string;
	redirectUri: string;
	responseType: string;
	domain: string;
}) {
	try {
		const urlParams = new URL(currentUrl);
		const error = urlParams.searchParams.get('error');
		const error_description = urlParams.searchParams.get('error_description');

		if (error) {
			Hub.dispatch(
				'auth',
				{ event: 'signInWithRedirect_failure' },
				'Auth',
				AMPLIFY_SYMBOL
			);
			throw new AuthError({
				message: AuthErrorTypes.OAuthSignInError,
				underlyingError: error_description,
				name: AuthErrorCodes.OAuthSignInError,
				recoverySuggestion: authErrorMessages.oauthSignInError.log,
			});
		}

		if (responseType === 'code') {
			return await handleCodeFlow({
				currentUrl,
				userAgentValue,
				clientId,
				redirectUri,
				domain,
			});
		} else {
			return await handleImplicitFlow({ currentUrl });
		}
	} catch (e) {
		throw e;
	}
}

async function validateStateFromURL(urlParams: URL): Promise<string> {
	if (!urlParams) {
	}
	const returnedState = urlParams.searchParams.get('state');

	validateState(returnedState);
	return returnedState;
}

function validateState(state?: string | null): asserts state {
	let savedState: string | undefined | null;

	store.loadOAuthState().then(resp => {
		savedState = resp;
	});

	// This is because savedState only exists if the flow was initiated by Amplify
	if (savedState && state && savedState !== state) {
		throw new AuthError({
			name: AuthErrorTypes.OAuthSignInError,
			message: 'An error occurred while validating the state',
			recoverySuggestion: 'Try to initiate an OAuth flow from Amplify',
		});
	}
}

// This has a reference for listeners that requires to be notified, TokenOrchestrator use this for load tokens
let resolveInflightPromise = () => {};

const invokeAndClearPromise = () => {
	resolveInflightPromise();
	resolveInflightPromise = () => {};
};
CognitoUserPoolsTokenProvider.setWaitForInflightOAuth(
	() =>
		new Promise(async (res, _rej) => {
			if (!(await store.loadOAuthInFlight())) {
				res();
			} else {
				resolveInflightPromise = res;
			}
			return;
		})
);

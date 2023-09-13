// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
	Amplify,
	CognitoUserPoolConfig,
	clearCredentials,
	defaultStorage,
} from '@aws-amplify/core';
import { SignOutRequest } from '../../../types/requests';
import { AuthSignOutResult } from '../../../types/results';
import { openAuthSession } from '../../../utils';
import { DefaultOAuthStore } from '../utils/signInWithRedirectStore';
import { tokenOrchestrator } from '../tokenProvider';
import {
	assertOAuthConfig,
	assertTokenProviderConfig,
	JWT,
} from '@aws-amplify/core/internals/utils';
import {
	globalSignOut as globalSignOutClient,
	revokeToken,
} from '../utils/clients/CognitoIdentityProvider';
import { getRegion } from '../utils/clients/CognitoIdentityProvider/utils';
import {
	assertAuthTokens,
	assertAuthTokensWithRefreshToken,
} from '../utils/types';

/**
 * Signs a user out
 *
 * @param signOutRequest - The SignOutRequest object
 * @returns AuthSignOutResult
 *
 * @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
 */
export async function signOut(
	signOutRequest?: SignOutRequest
): Promise<AuthSignOutResult> {
	const cognitoConfig = Amplify.getConfig().Auth?.Cognito;
	assertTokenProviderConfig(cognitoConfig);

	if (signOutRequest?.global) {
		return globalSignOut(cognitoConfig);
	} else {
		return clientSignOut(cognitoConfig);
	}
}

async function clientSignOut(cognitoConfig: CognitoUserPoolConfig) {
	try {
		const authTokens = await tokenOrchestrator.getTokenStore().loadTokens();
		assertAuthTokensWithRefreshToken(authTokens);
		if (isSessionRevocable(authTokens.accessToken)) {
			await revokeToken(
				{
					region: getRegion(cognitoConfig.userPoolId),
				},
				{
					ClientId: cognitoConfig.userPoolClientId,
					Token: authTokens.refreshToken,
				}
			);
		}

		await handleOAuthSignOut(cognitoConfig);
	} catch (err) {
		// this shouldn't throw
		// TODO(v6): add logger message
	} finally {
		tokenOrchestrator.clearTokens();
		await clearCredentials();
	}
}

async function globalSignOut(cognitoConfig: CognitoUserPoolConfig) {
	try {
		const tokens = await tokenOrchestrator.getTokenStore().loadTokens();
		assertAuthTokens(tokens);
		await globalSignOutClient(
			{
				region: getRegion(cognitoConfig.userPoolId),
			},
			{
				AccessToken: tokens.accessToken.toString(),
			}
		);

		await handleOAuthSignOut(cognitoConfig);
	} catch (err) {
		// it should not throw
		// TODO(v6): add logger
	} finally {
		tokenOrchestrator.clearTokens();
		await clearCredentials();
	}
}

async function handleOAuthSignOut(cognitoConfig: CognitoUserPoolConfig) {
	try {
		assertOAuthConfig(cognitoConfig);
	} catch (err) {
		// all good no oauth handling
		return;
	}

	const oauthStore = new DefaultOAuthStore(defaultStorage);
	oauthStore.setAuthConfig(cognitoConfig);
	const isOAuthSignIn = await oauthStore.loadOAuthSignIn();
	oauthStore.clearOAuthData();

	if (isOAuthSignIn) {
		return oAuthSignOutRedirect(cognitoConfig);
	}
}

async function oAuthSignOutRedirect(authConfig: CognitoUserPoolConfig) {
	assertOAuthConfig(authConfig);
	const { domain, redirectSignOut } = authConfig.loginWith.oauth;

	let oAuthLogoutEndpoint = `https://${domain}/logout?`;

	const client_id = authConfig.userPoolClientId;
	const signout_uri = redirectSignOut[0];

	oAuthLogoutEndpoint += Object.entries({
		client_id,
		logout_uri: encodeURIComponent(signout_uri),
	})
		.map(([k, v]) => `${k}=${v}`)
		.join('&');

	// dispatchAuthEvent(
	// 	'oAuthSignOut',
	// 	{ oAuth: 'signOut' },
	// 	`Signing out from ${oAuthLogoutEndpoint}`
	// );
	// logger.debug(`Signing out from ${oAuthLogoutEndpoint}`);

	await openAuthSession(oAuthLogoutEndpoint, redirectSignOut);
}

function isSessionRevocable(token: JWT) {
	if (token) {
		try {
			const { origin_jti } = token.payload;
			return !!origin_jti;
		} catch (err) {
			// Nothing to do, token doesnt have origin_jti claim
		}
	}

	return false;
}

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetServerSidePropsContext as NextGetServerSidePropsContext } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AmplifyServer } from '@aws-amplify/core/internals/adapter-core';

export namespace NextServer {
	/**
	 * This context is normally available in the following:
	 *   - Next App Router [middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
	 *   - Next App Router [route handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
	 *     when using `NextResponse` to create the response of the route handler
	 */
	export type NextRequestAndNextResponseContext = {
		request: NextRequest;
		response: NextResponse;
	};

	/**
	 * This context is normally available in the following:
	 *   - Next App Router [route handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
	 *     when using the Web API [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
	 *     to create the response of the route handler
	 */
	export type NextRequestAndResponseContext = {
		request: NextRequest;
		response: Response;
	};

	/**
	 * This context is normally available in the following:
	 *   - Next [Server Component](https://nextjs.org/docs/getting-started/react-essentials#server-components)
	 *     where the [`cookies`](https://nextjs.org/docs/app/api-reference/functions/cookies)
	 *     function can be imported and called
	 */
	export type ServerComponentContext = {
		cookies: typeof cookies;
	};

	export type ServerActionContext = ServerComponentContext;

	/**
	 * This context is normally available in the
	 * [`getServerSideProps`](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props)
	 * function of the Next Pages Router.
	 */
	export type GetServerSidePropsContext = {
		request: NextGetServerSidePropsContext['req'];
		response: NextGetServerSidePropsContext['res'];
	};

	export type Context =
		| NextRequestAndNextResponseContext
		| NextRequestAndResponseContext
		| ServerComponentContext
		| GetServerSidePropsContext;

	export interface RunWithContextInput<OperationResult> {
		nextServerContext: Context | null;
		operation: (
			contextSpec: AmplifyServer.ContextSpec
		) => OperationResult | void | Promise<OperationResult | void>;
	}

	export interface RunOperationWithContext {
		<OperationResult>(
			input: RunWithContextInput<OperationResult>
		): Promise<OperationResult | void>;
	}
}

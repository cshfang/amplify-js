// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AnalyticsAction } from '@aws-amplify/core';
import { identifyUser as identifyUserCore } from '@aws-amplify/core/internals/providers/pinpoint';
import { AnalyticsValidationErrorCode } from '../../../errors';
import { getAnalyticsUserAgentString } from '../../../utils/userAgent';
import {
	PinpointIdentifyUserParameters,
	UpdateEndpointException,
} from '../types';
import { resolveConfig, resolveCredentials } from '../utils';

/**
 * Identifies the current user with Pinpoint.
 *
 * @param {PinpointIdentifyUserParameters} params parameters used to construct requests sent to pinpoint service's
 * UpdateEndpoint API.
 *
 * @throws An {@link UpdateEndpointException} when the underlying Pinpoint service returns an error.
 * @throws An {@link AnalyticsValidationErrorCode} when API call parameters are invalid.
 */
export const identifyUser = async ({
	userId,
	userProfile,
}: PinpointIdentifyUserParameters): Promise<void> => {
	const { credentials, identityId } = await resolveCredentials();
	const { appId, region } = resolveConfig();
	identifyUserCore({
		appId,
		category: 'Analytics',
		credentials,
		identityId,
		region,
		userId,
		userProfile,
		userAgentValue: getAnalyticsUserAgentString(AnalyticsAction.UpdateEndpoint),
	});
};

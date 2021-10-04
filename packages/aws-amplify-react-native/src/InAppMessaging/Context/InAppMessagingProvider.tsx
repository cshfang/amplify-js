/*
 * Copyright 2017-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Notifications, InAppMessage } from '@aws-amplify/notifications';

import { InAppMessageComponents } from '..';
import InAppMessagingContext from './InAppMessagingContext';

export default function InAppMessagingProvider({
	children,
	components = {},
}: {
	children: ReactNode;
	components?: InAppMessageComponents;
}) {
	const [inAppMessages, setInAppMessages] = useState<InAppMessage[]>([]);

	useEffect(() => {
		Notifications.setInAppMessagesHandler(setInAppMessages);
	}, []);

	const clearInAppMessages = useCallback(() => {
		setInAppMessages([]);
	}, []);

	const displayInAppMessage = useCallback((inAppMessage: InAppMessage) => {
		setInAppMessages([inAppMessage]);
	}, []);

	return (
		<InAppMessagingContext.Provider
			value={{
				clearInAppMessages,
				components,
				displayInAppMessage,
				inAppMessages,
			}}
		>
			{children}
		</InAppMessagingContext.Provider>
	);
}

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
import { InAppMessage } from '@aws-amplify/notifications';

<<<<<<< HEAD
=======
import { ReactElement } from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import {
	InAppMessage,
	InAppMessageAction,
	InAppMessageButton,
	InAppMessageContent,
} from '@aws-amplify/notifications';

// TODO: replace with actual Component types
type ButtonProps = any;
type IconButtonProps = any;

>>>>>>> 5c8efac16 (feat(in-app-messaging): add InAppMessageDisplay and useInAppMessage)
export type InAppMessagingContextType = {
	clearInAppMessages: () => void;
	displayInAppMessage: (inAppMessage: InAppMessage) => void;
	inAppMessages: InAppMessage[];
<<<<<<< HEAD
=======
	components?: InAppMessageComponents;
};

export type InAppMessageActionHandler = (
	action: InAppMessageAction,
	url?: string
) => Promise<void>;

export interface InAppMessageButtonProps
	extends Omit<InAppMessageButton, 'action' | 'url'> {
	onPress: () => void;
}

type InAppMessageComponentStyle = {
	closeIcon?: IconButtonProps['style'];
	container?: ViewStyle;
	header?: TextStyle;
	message?: TextStyle;
	primaryButton?: ButtonProps['style'];
	secondaryButton?: ButtonProps['style'];
};

export enum InAppMessagePosition {
	BOTTOM_BANNER = 'bottom',
	MIDDLE_BANNER = 'middle',
	TOP_BANNER = 'top',
}

export interface InAppMessageContentProps
	extends Omit<InAppMessageContent, 'primaryButton' | 'secondaryButton'> {
	primaryButton?: InAppMessageButtonProps;
	secondaryButton?: InAppMessageButtonProps;
}

interface InAppMessageBaseComponentProps extends InAppMessageContentProps {
	onClose?: () => void;
	style?: InAppMessageComponentStyle;
}

export interface BannerMessageProps extends InAppMessageBaseComponentProps {
	position: InAppMessagePosition;
}

export interface CarouselMessageProps {
	data: InAppMessageContentProps[];
	onClose?: InAppMessageBaseComponentProps['onClose'];
	style?: InAppMessageBaseComponentProps['style'];
}

export interface FullScreenMessageProps
	extends InAppMessageBaseComponentProps {}

export type InAppMessageComponentProps =
	| BannerMessageProps
	| CarouselMessageProps
	| FullScreenMessageProps;

export type InAppMessageComponent = (
	props: InAppMessageComponentProps
) => ReactElement;

export type InAppMessageComponents = {
	BannerMessage?: (props: BannerMessageProps) => ReactElement;
	CarouselMessage?: (props: CarouselMessageProps) => ReactElement;
	FullScreenMessage?: (props: FullScreenMessageProps) => ReactElement;
>>>>>>> 5c8efac16 (feat(in-app-messaging): add InAppMessageDisplay and useInAppMessage)
};

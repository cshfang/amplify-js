// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Storage instance options
 */

import { ICredentials } from '@aws-amplify/core';
import {
	StorageProvider,
	StorageProviderApi,
	StorageProviderApiOptionsIndexMap,
	AWSS3Provider,
	StorageProviderWithCopy,
	S3ProviderGetOuput,
	S3ProviderRemoveOutput,
	S3ProviderListOutput,
	S3ProviderCopyOutput,
	S3ProviderPutOutput,
	S3ProviderGetPropertiesOutput,
	StorageProviderWithGetProperties,
} from '../';

type Tail<T extends any[]> = ((...t: T) => void) extends (
	h: any,
	...r: infer R
) => void
	? R
	: never;

type Last<T extends any[]> = T[Exclude<keyof T, keyof Tail<T>>];

// Utility type to extract the config parameter type of a function
// Uses position of params per API to determine which parameter to target
type ConfigParameter<
	F extends (...args: any) => any,
	U extends StorageProviderApi,
> = Parameters<F>[StorageProviderApiOptionsIndexMap[U]];

export interface StorageOptions {
	credentials?: ICredentials;
	region?: string;
	level?: StorageAccessLevel;
	bucket?: string;
	provider?: string;
	/**
	 * Custom mapping of your prefixes.
	 * For example, customPrefix: { public: 'myPublicPrefix' } will make public level operations access 'myPublicPrefix/'
	 * instead of the default 'public/'.
	 */
	customPrefix?: CustomPrefix;
	/**
	 * if set to true, automatically sends Storage Events to Amazon Pinpoint
	 **/
	track?: boolean;
	dangerouslyConnectToHttpEndpointForTesting?: boolean;
}

export type StorageAccessLevel = 'public' | 'protected' | 'private';

export type CustomPrefix = {
	[key in StorageAccessLevel]?: string;
};

export type StorageCopyTarget = {
	key: string;
	level?: string;
	identityId?: string;
};

export type StorageCopySource = StorageCopyTarget;

export type StorageCopyDestination = Omit<StorageCopyTarget, 'identityId'>;

/**
 * If provider is AWSS3, provider doesn't have to be specified since it's the default, else it has to be passed into
 * config.
 */
type StorageOperationConfig<
	T extends
		| StorageProvider
		| StorageProviderWithCopy
		| StorageProviderWithGetProperties,
	U extends StorageProviderApi,
> = ReturnType<T['getProviderName']> extends 'AWSS3'
	? ConfigParameter<AWSS3Provider[U], U> // check if it has 'copy' function because 'copy' is optional
	: T extends StorageProviderWithGetProperties & StorageProviderWithCopy
	? ConfigParameter<T[U], U> & {
			provider: ReturnType<T['getProviderName']>;
	  }
	: T extends StorageProviderWithCopy
	? ConfigParameter<T[Exclude<U, 'getProperties'>], U> & {
			provider: ReturnType<T['getProviderName']>;
	  }
	: T extends StorageProviderWithGetProperties
	? ConfigParameter<T[Exclude<U, 'copy'>], U> & {
			provider: ReturnType<T['getProviderName']>;
	  }
	: ConfigParameter<T[Exclude<U, 'copy' | 'getProperties'>], U> & {
			provider: ReturnType<T['getProviderName']>;
	  };

export type StorageGetConfig<T extends Record<string, any>> =
	T extends StorageProvider
		? StorageOperationConfig<T, 'get'>
		: StorageOperationConfigMap<
				StorageOperationConfig<AWSS3Provider, 'get'>,
				T
		  >;

export type StorageGetPropertiesConfig<T extends Record<string, any>> =
	T extends StorageProviderWithGetProperties
		? StorageOperationConfig<T, 'getProperties'>
		: StorageOperationConfigMap<
				StorageOperationConfig<AWSS3Provider, 'getProperties'>,
				T
		  >;

export type StoragePutConfig<T extends Record<string, any>> =
	T extends StorageProvider
		? StorageOperationConfig<T, 'put'>
		: StorageOperationConfigMap<
				StorageOperationConfig<AWSS3Provider, 'put'>,
				T
		  >;

export type StorageRemoveConfig<T extends Record<string, any>> =
	T extends StorageProvider
		? StorageOperationConfig<T, 'remove'>
		: StorageOperationConfigMap<
				StorageOperationConfig<AWSS3Provider, 'remove'>,
				T
		  >;

export type StorageListConfig<T extends Record<string, any>> =
	T extends StorageProvider
		? StorageOperationConfig<T, 'list'>
		: StorageOperationConfigMap<
				StorageOperationConfig<AWSS3Provider, 'list'>,
				T
		  >;

export type StorageCopyConfig<T extends Record<string, any>> =
	T extends StorageProviderWithCopy
		? StorageOperationConfig<T, 'copy'>
		: StorageOperationConfigMap<
				StorageOperationConfig<AWSS3Provider, 'copy'>,
				T
		  >;

/**
 * Utility type for checking if the generic type is a provider or a Record that has the key 'provider'.
 * If it's a provider, check if it's the S3 Provider, use the default type else use the generic's 'get' method
 * return type.
 * If it's a Record, check if provider is 'AWSS3', use the default type else use any.
 */
type PickProviderOutput<
	DefaultOutput,
	T,
	api extends StorageProviderApi,
> = T extends StorageProvider
	? T['getProviderName'] extends 'AWSS3'
		? DefaultOutput
		: T extends StorageProviderWithCopy & StorageProviderWithGetProperties
		? ReturnType<T[api]>
		: T extends StorageProviderWithCopy
		? ReturnType<T[Exclude<api, 'getProperties'>]>
		: T extends StorageProviderWithGetProperties
		? ReturnType<T[Exclude<api, 'copy'>]>
		: ReturnType<T[Exclude<api, 'copy' | 'getProperties'>]>
	: T extends { provider: string }
	? T extends { provider: 'AWSS3' }
		? DefaultOutput
		: Promise<any>
	: DefaultOutput;

export type StorageGetOutput<T extends StorageProvider | Record<string, any>> =
	PickProviderOutput<Promise<S3ProviderGetOuput<T>>, T, 'get'>;

export type StoragePutOutput<T> = PickProviderOutput<
	S3ProviderPutOutput<T>,
	T,
	'put'
>;

export type StorageRemoveOutput<T> = PickProviderOutput<
	Promise<S3ProviderRemoveOutput>,
	T,
	'remove'
>;

export type StorageListOutput<T> = PickProviderOutput<
	Promise<S3ProviderListOutput>,
	T,
	'list'
>;

export type StorageCopyOutput<T> = PickProviderOutput<
	Promise<S3ProviderCopyOutput>,
	T,
	'copy'
>;

export type StorageGetPropertiesOutput<T> = PickProviderOutput<
	Promise<S3ProviderGetPropertiesOutput>,
	T,
	'getProperties'
>;

/**
 * Utility type to allow custom provider to use any config keys, if provider is set to AWSS3 then it should use
 * AWSS3Provider's config.
 */
export type StorageOperationConfigMap<
	Default,
	T extends Record<string, any>,
> = T extends { provider: string }
	? T extends { provider: 'AWSS3' }
		? Default
		: T & { provider: string }
	: Default;

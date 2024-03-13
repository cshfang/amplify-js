// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { AsyncStorageStatic } from '@react-native-async-storage/async-storage';

let asyncStorageOverride: AsyncStorageStatic;

export const getAsyncStorageOverride = () => asyncStorageOverride;

export const setAsyncStorageOverride = (override: unknown) =>
	(asyncStorageOverride = override as AsyncStorageStatic);

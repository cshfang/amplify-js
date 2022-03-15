/*
 * Copyright 2017-2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, ListRenderItemInfo, ScaledSize, View, ViewToken } from 'react-native';

import CarouselPageIndicator from './CarouselPageIndicator';
import { styles } from './styles';
import { CarouselProps } from './types';

export default function Carousel<T>(props: CarouselProps<T>) {
	const { data, indicatorActiveStyle, indicatorInactiveStyle, renderItem, style } = props;
	const flatListRef = useRef<FlatList>();
	const indexRef = useRef(0);
	const [currentIndex, setCurrentIndex] = useState(0);
	const widthRef = useRef(Dimensions.get('window').width);
	const [width, setWidth] = useState(widthRef.current);

	const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
		if (viewableItems.length !== 1) {
			return;
		}
		const [item] = viewableItems;
		indexRef.current = item.index;
		setCurrentIndex(indexRef.current);
	});

	const updateOrientation = useCallback((updatedWidth: number) => {
		if (widthRef.current !== updatedWidth) {
			widthRef.current = updatedWidth;
			setWidth(updatedWidth);
		}
	}, []);

	useEffect(() => {
		// on width change (due to orientation change), jump to the new index offset
		flatListRef.current.scrollToOffset({ offset: width * indexRef.current, animated: false });
	}, [width]);

	useEffect(() => {
		const orientationHandler = ({ screen }: { screen: ScaledSize }) => {
			updateOrientation(screen.width);
		};
		const subscription = Dimensions.addEventListener('change', orientationHandler);

		// Clean up listener. Dimensions.removeEventListener is deprecated as of React Native 0.65 but it is technically
		// available so try to remove via a `EmitterSubscription` first before falling back to `removeEventListener`
		return () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (typeof (subscription as any)?.remove === 'function') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				(subscription as any)?.remove();
			} else {
				Dimensions.removeEventListener('change', orientationHandler);
			}
		};
	}, [updateOrientation]);

	const carouselRenderItem = (renderInfo: ListRenderItemInfo<T>) => {
		return <View style={{ width }}>{renderItem(renderInfo)}</View>;
	};

	return (
		<>
			<FlatList
				bounces={false}
				data={data}
				decelerationRate="fast"
				disableIntervalMomentum
				horizontal
				onViewableItemsChanged={onViewableItemsChanged.current}
				viewabilityConfig={{
					itemVisiblePercentThreshold: 60,
				}}
				renderItem={carouselRenderItem}
				renderToHardwareTextureAndroid
				ref={flatListRef}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				snapToInterval={width}
				snapToAlignment="start"
				style={style}
			/>
			<CarouselPageIndicator
				activeStyle={indicatorActiveStyle}
				currentIndex={currentIndex}
				numberOfItems={data.length}
				inactiveStyle={indicatorInactiveStyle}
				style={styles.indicator}
			/>
		</>
	);
}

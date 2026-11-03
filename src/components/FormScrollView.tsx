import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

type Props = ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  focusMargin?: number;
};
const FormScrollView = forwardRef<ScrollView, Props>(function FormScrollView(
  {
    children,
    containerStyle,
    contentContainerStyle,
    focusMargin = 24,
    onScroll,
    keyboardShouldPersistTaps = "handled",
    ...rest
  },
  forwardedRef
) {
  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const lastFocused = useRef<any>(null);
  const [extraBottom, setExtraBottom] = useState(0);

  const setRefs = useCallback(
    (node: ScrollView | null) => {
      scrollRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as any).current = node;
    },
    [forwardedRef]
  );

  const scrollFocusedIntoView = useCallback(() => {
    const top = keyboardTop.current;
    if (top == null) return;
    const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
    if (!input?.measureInWindow) return;
    lastFocused.current = input;
    input.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      const visibleBottom = top - focusMargin;
      const inputBottom = y + h;
      if (inputBottom > visibleBottom) {
        scrollRef.current?.scrollTo({
          y: scrollY.current + (inputBottom - visibleBottom),
          animated: true,
        });
      }
    });
  }, [focusMargin]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      const kbTop = e.endCoordinates.screenY;
      keyboardTop.current = kbTop;

      setTimeout(() => {
        containerRef.current?.measureInWindow((_x, y, _w, h) => {
          const overlap = Math.max(0, y + h - kbTop);
          setExtraBottom(overlap > 0 ? overlap + focusMargin : 0);
          setTimeout(scrollFocusedIntoView, 120);
        });
      }, Platform.OS === "ios" ? 0 : 50);
    };

    const onHide = () => {
      keyboardTop.current = null;
      lastFocused.current = null;
      setExtraBottom(0);
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [focusMargin, scrollFocusedIntoView]);

  useEffect(() => {
    if (extraBottom === 0) return;
    const id = setInterval(() => {
      const current = (TextInput as any).State?.currentlyFocusedInput?.();
      if (current && current !== lastFocused.current) scrollFocusedIntoView();
    }, 250);
    return () => clearInterval(id);
  }, [extraBottom, scrollFocusedIntoView]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  const flat: any = StyleSheet.flatten(contentContainerStyle) || {};
  const basePaddingBottom: number =
    typeof flat.paddingBottom === "number"
      ? flat.paddingBottom
      : typeof flat.paddingVertical === "number"
      ? flat.paddingVertical
      : typeof flat.padding === "number"
      ? flat.padding
      : 0;

  return (
    <View ref={containerRef} collapsable={false} style={[{ flex: 1 }, containerStyle]}>
      <ScrollView
        ref={setRefs}
        {...rest}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: basePaddingBottom + extraBottom }]}
      >
        {children}
      </ScrollView>
    </View>
  );
});

export default FormScrollView;

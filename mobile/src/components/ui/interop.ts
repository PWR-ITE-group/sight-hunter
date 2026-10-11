/**
 * NativeWind styles core RN components only. Anything else that receives `className` has to be
 * registered here, or the classes are silently dropped — which is how buttons, chips and the
 * old bottom sheet ended up without background, padding or size on the test phones.
 * Imported once from the root layout; components reuse the registered AnimatedPressable.
 */
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { cssInterop } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

cssInterop(AnimatedPressable, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });
cssInterop(LinearGradient, { className: 'style' });
cssInterop(Image, { className: 'style' });
cssInterop(SafeAreaView, { className: 'style' });

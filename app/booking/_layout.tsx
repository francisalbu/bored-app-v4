import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="payment-new" />
      <Stack.Screen name="payment-fixed" />
      <Stack.Screen name="payment-stripe-official" />
    </Stack>
  );
}

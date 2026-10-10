import { Redirect, useLocalSearchParams } from 'expo-router';

// Shareable menu link: /m/<share_slug>
export default function SharedMenuLink() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={{ pathname: '/menu', params: { slug } }} />;
}

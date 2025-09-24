import { redirect } from 'next/navigation';

export default function PlatformPage() {
  // Redirect to the new home route
  redirect('/home');
}

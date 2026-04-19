import { redirect } from 'next/navigation';

// This intermediate page is no longer needed — users go directly
// to /public/book/domestic or /public/book/international from the homepage CTA.
export default function PublicBookPage() {
  redirect('/');
}

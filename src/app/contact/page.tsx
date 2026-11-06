import {publicPageMetadata} from '@/lib/seo';
import DesktopInformationPage from '@/app/components/DesktopInformationPage';

export const metadata = publicPageMetadata('/contact');

export default function Page() {
  return <DesktopInformationPage page="contact" />;
}

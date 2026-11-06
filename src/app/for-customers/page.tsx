import {publicPageMetadata} from '@/lib/seo';
import DesktopInformationPage from '@/app/components/DesktopInformationPage';

export const metadata = publicPageMetadata('/for-customers');

export default function Page() {
  return <DesktopInformationPage page="for-customers" />;
}

import {publicPageMetadata} from '@/lib/seo';
import DesktopInformationPage from '@/app/components/DesktopInformationPage';

export const metadata = publicPageMetadata('/for-transporters');

export default function Page() {
  return <DesktopInformationPage page="for-transporters" />;
}

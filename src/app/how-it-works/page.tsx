import {publicPageMetadata} from '@/lib/seo';
import DesktopInformationPage from '@/app/components/DesktopInformationPage';

export const metadata = publicPageMetadata('/how-it-works');

export default function Page() {
  return <DesktopInformationPage page="how-it-works" />;
}

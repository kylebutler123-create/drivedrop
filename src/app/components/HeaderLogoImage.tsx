import MobileBrandLogo from './MobileBrandLogo';

export default function HeaderLogoImage(){
  return <>
    <picture>
      <source media="(min-width: 761px)" srcSet="/drivedrop-mobile-logo-rebuilt.svg"/>
      <img src="/drivedrop-mobile-logo-rebuilt.svg" alt="DriveDrop"/>
    </picture>
    <MobileBrandLogo/>
  </>;
}

import MobileBrandLogo from './MobileBrandLogo';

export default function HeaderLogoImage(){
  return <>
    <picture>
      <source media="(min-width: 761px)" srcSet="/moveamotor-mobile-logo.svg"/>
      <img src="/moveamotor-mobile-logo.svg" alt="MoveAmotor"/>
    </picture>
    <MobileBrandLogo/>
  </>;
}

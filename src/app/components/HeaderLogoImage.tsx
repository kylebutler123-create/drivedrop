import MobileBrandLogo from './MobileBrandLogo';

export default function HeaderLogoImage(){
  return <>
    <picture>
      <source media="(min-width: 761px)" srcSet="/moveamotor-logo.svg"/>
      <img src="/moveamotor-logo.svg" alt="MoveAMotor"/>
    </picture>
    <MobileBrandLogo/>
  </>;
}

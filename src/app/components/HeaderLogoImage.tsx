export default function HeaderLogoImage(){
  return <picture>
    <source media="(min-width: 761px)" srcSet="/drivedrop-logo-route-slanted.webp"/>
    <img src="/drivedrop-logo-route-slanted.webp" alt="DriveDrop"/>
  </picture>;
}

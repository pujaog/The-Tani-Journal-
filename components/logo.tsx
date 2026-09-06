type LogoProps = { variant?: 'light' | 'dark'; className?: string }

export function Logo({ variant = 'dark', className }: LogoProps) {
  return (
    <img
      src="/logo/tani-journal-logo.svg"
      alt="The Tani Journal"
      className={className}
      data-variant={variant}
    />
  )
}
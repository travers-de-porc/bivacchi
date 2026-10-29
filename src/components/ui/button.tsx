import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva('btn', {
  variants: { variant: { default: 'btn-primary', outline: 'btn-outline', ghost: 'btn-ghost', secondary: 'btn-secondary' }, size: { default: '', sm: 'btn-sm', icon: 'btn-icon' } },
  defaultVariants: { variant: 'default', size: 'default' },
})
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

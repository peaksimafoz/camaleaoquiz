import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Gera um slug URL-safe a partir de um texto (para o campo slug do quiz).
// normalize('NFD') separa os acentos em marcas combinantes, que o replace
// seguinte (tudo que não for a-z0-9 vira '-') remove junto.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

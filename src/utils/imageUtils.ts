import placeholderImage from '@/assets/placeholder.svg'
import { paths } from '@/config/endpoints'

export const imageUrlToThumbNailUrl = (imagePath: string | null) => {
  if (!imagePath) {
    return placeholderImage
  }
  const path = imagePath.split('/')
  path.splice(2, 1, 'thumbnails')
  return `${paths.imagesPath}${path.join('/')}`
}

export const leadImageToUrl = (imagePath: string | null) => {
  if (!imagePath) {
    return placeholderImage
  }
  return `${paths.imagesPath}${imagePath}`
}

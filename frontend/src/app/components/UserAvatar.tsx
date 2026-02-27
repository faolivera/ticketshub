import { FC } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from './ui/utils';

interface UserAvatarProps {
  name: string;
  src?: string;
  className?: string;
  alt?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export const UserAvatar: FC<UserAvatarProps> = ({
  name,
  src,
  className,
  alt,
}) => {
  return (
    <Avatar className={cn('flex-shrink-0', className)}>
      <AvatarImage src={src} alt={alt ?? name} />
      <AvatarFallback
        className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold"
        style={{ fontSize: '40cqw' }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;

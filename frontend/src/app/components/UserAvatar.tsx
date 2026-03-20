import { FC, type CSSProperties } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from './ui/utils';

interface UserAvatarProps {
  name: string;
  src?: string;
  className?: string;
  alt?: string;
  style?: CSSProperties;
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
  style,
}) => {
  return (
    <Avatar className={cn('flex-shrink-0', className)} style={style}>
      <AvatarImage src={src} alt={alt ?? name} />
      <AvatarFallback
        className="bg-muted text-muted-foreground font-semibold"
        style={{ fontSize: '40cqw' }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;

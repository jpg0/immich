import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AuthApiKey, AuthSession, AuthSharedLink, AuthUser, UserAdmin } from 'src/database';
import { ImmichCookie, UserMetadataKey } from 'src/enum';
import { UserMetadataItem } from 'src/types';
import { Optional, PinCode, toEmail } from 'src/validation';

export type CookieResponse = {
  isSecure: boolean;
  values: Array<{ key: ImmichCookie; value: string | null }>;
};

export class AuthDto {
  user!: AuthUser;

  apiKey?: AuthApiKey;
  sharedLink?: AuthSharedLink;
  session?: AuthSession;
}

export class LoginCredentialDto {
  @IsEmail({ require_tld: false })
  @Transform(toEmail)
  @IsNotEmpty()
  @ApiProperty({ example: 'testuser@email.com' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password' })
  password!: string;
}

export class LoginResponseDto {
  accessToken!: string;
  userId!: string;
  userEmail!: string;
  name!: string;
  profileImagePath!: string;
  isAdmin!: boolean;
  shouldChangePassword!: boolean;
  isOnboarded!: boolean;
}

export function mapLoginResponse(entity: UserAdmin, accessToken: string): LoginResponseDto {
  const onboardingMetadata = entity.metadata.find(
    (item): item is UserMetadataItem<UserMetadataKey.Onboarding> => item.key === UserMetadataKey.Onboarding,
  )?.value;

  return {
    accessToken,
    userId: entity.id,
    userEmail: entity.email,
    name: entity.name,
    isAdmin: entity.isAdmin,
    profileImagePath: entity.profileImagePath,
    shouldChangePassword: entity.shouldChangePassword,
    isOnboarded: onboardingMetadata?.isOnboarded ?? false,
  };
}

export class LogoutResponseDto {
  successful!: boolean;
  redirectUri!: string;
}

export class SignUpDto extends LoginCredentialDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Admin' })
  name!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ example: 'password' })
  newPassword!: string;
}

export class PinCodeSetupDto {
  @PinCode()
  pinCode!: string;
}

export class PinCodeResetDto {
  @PinCode({ optional: true })
  pinCode?: string;

  @Optional()
  @IsString()
  @IsNotEmpty()
  password?: string;
}

export class SessionUnlockDto extends PinCodeResetDto {}

export class PinCodeChangeDto extends PinCodeResetDto {
  @PinCode()
  newPinCode!: string;
}

export class ValidateAccessTokenResponseDto {
  authStatus!: boolean;
}

export class OAuthCallbackDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  url!: string;

  @Optional()
  @IsString()
  state?: string;

  @Optional()
  @IsString()
  codeVerifier?: string;
}

export class OAuthConfigDto {
  @IsNotEmpty()
  @IsString()
  redirectUri!: string;

  @Optional()
  @IsString()
  state?: string;

  @Optional()
  @IsString()
  codeChallenge?: string;
}

export class OAuthAuthorizeResponseDto {
  url!: string;
}

export class AuthStatusResponseDto {
  pinCode!: boolean;
  password!: boolean;
  isElevated!: boolean;
  expiresAt?: string;
  pinExpiresAt?: string;
}

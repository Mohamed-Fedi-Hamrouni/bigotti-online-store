import {
  IsNotEmpty,
  IsString,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function Matches(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'matchesProperty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return value === (args.object as Record<string, unknown>)[property];
        },
      },
    });
}

function DiffersFrom(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'differsFromProperty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return value !== (args.object as Record<string, unknown>)[property];
        },
      },
    });
}

export class ChangeAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @DiffersFrom('currentPassword', {
    message: 'Le nouveau mot de passe doit être différent du mot de passe actuel.',
  })
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @Matches('newPassword', {
    message: 'La confirmation du mot de passe ne correspond pas.',
  })
  confirmPassword!: string;
}

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangeAdminPasswordDto } from './change-admin-password.dto';
import { UpdateAdminProfileDto } from './update-admin-profile.dto';

describe('DTO profil administrateur', () => {
  it('refuse un nom vide', async () => {
    const errors = await validate(
      plainToInstance(UpdateAdminProfileDto, { fullName: '   ' }),
    );
    expect(errors).not.toHaveLength(0);
  });

  it('refuse un nouveau mot de passe trop faible', async () => {
    const errors = await validate(
      plainToInstance(ChangeAdminPasswordDto, {
        currentPassword: 'Ancien123',
        newPassword: 'seulementlettres',
        confirmNewPassword: 'seulementlettres',
      }),
    );
    expect(errors).not.toHaveLength(0);
  });

  it('refuse une confirmation différente', async () => {
    const errors = await validate(
      plainToInstance(ChangeAdminPasswordDto, {
        currentPassword: 'Ancien123',
        newPassword: 'Nouveau123',
        confirmNewPassword: 'Different123',
      }),
    );
    expect(errors).not.toHaveLength(0);
  });
});

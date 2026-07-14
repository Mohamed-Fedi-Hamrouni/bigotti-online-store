import { IsString, Matches } from "class-validator";
import { GoogleCredentialDto } from "./google-credential.dto";

export class GoogleRegisterCustomerDto extends GoogleCredentialDto {
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      "Le téléphone doit contenir entre 8 et 15 chiffres, avec + optionnel.",
  })
  phone!: string;
}

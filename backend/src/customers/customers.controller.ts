import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomersService } from './customers.service';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('admin')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  findAllAdmin() {
    return this.customersService.findAllAdmin();
  }

  @Get('admin/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  findOneAdmin(@Param('id') id: string) {
    return this.customersService.findOneAdmin(id);
  }

  @Patch('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCustomerStatusDto) {
    return this.customersService.updateStatus(id, dto);
  }
}

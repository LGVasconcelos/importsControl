import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  private async seed() {
    const count = await this.userRepo.count();
    if (count > 0) return;

    const hash1 = await bcrypt.hash('admin123', 10);
    const hash2 = await bcrypt.hash('socio123', 10);

    await this.userRepo.save([
      { name: 'Administrador', email: 'admin@empresa.com', passwordHash: hash1, role: UserRole.ADMIN },
      { name: 'Sócio', email: 'socio@empresa.com', passwordHash: hash2, role: UserRole.ADMIN },
    ]);

    console.log('✅ Usuários padrão criados:');
    console.log('   admin@empresa.com / admin123');
    console.log('   socio@empresa.com / socio123');
  }

  findAll() {
    return this.userRepo.find({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
  }

  findOne(id: number) {
    return this.userRepo.findOne({ where: { id }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  }

  async updatePassword(id: number, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(id, { passwordHash: hash });
    return { message: 'Senha atualizada com sucesso' };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from './types/authenticated-user.type';
import { JwtPayload } from './types/jwt-payload.type';

type LoginResult = {
  accessToken: string;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersRepository.findOne({
      where: { email, isActive: true },
      relations: { stage: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const authenticatedUser = this.toAuthenticatedUser(user);
    const payload: JwtPayload = {
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      stageId: authenticatedUser.stageId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: authenticatedUser,
    };
  }

  async findAuthenticatedUserById(
    id: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      relations: { stage: true },
    });

    return user ? this.toAuthenticatedUser(user) : null;
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      stageId: user.stage?.id ?? null,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  UserPermissionDto,
  UserQueryDto,
  UserResponseDto,
} from './dto/user.dto';
import { UserPermission } from './entities/user-permission.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserPermission)
    private readonly permissionsRepository: Repository<UserPermission>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      permissions: this.buildPermissions(dto.permissions ?? []),
    });
    const saved = await this.usersRepository.save(user);
    return this.findOne(saved.id);
  }

  async findAll(
    query: UserQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.search
      ? [
          { fullName: ILike(`%${query.search}%`), isActive: true },
          { email: ILike(`%${query.search}%`), isActive: true },
        ]
      : { isActive: true };
    const [items, total] = await this.usersRepository.findAndCount({
      where,
      relations: { permissions: true },
      order: { fullName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((user) => this.toResponse(user)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return this.toResponse(await this.findEntity(id));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findEntity(id);

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }
    if (dto.email !== undefined) {
      user.email = dto.email;
    }
    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    await this.usersRepository.manager.transaction(async (manager) => {
      if (dto.permissions !== undefined) {
        await manager.delete(UserPermission, { user: { id } });
        user.permissions = this.buildPermissions(dto.permissions);
      }
      await manager.save(user);
    });

    return this.findOne(id);
  }

  async softDelete(id: string): Promise<UserResponseDto> {
    const user = await this.findEntity(id);
    user.isActive = false;
    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  private async findEntity(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private buildPermissions(permissions: UserPermissionDto[]): UserPermission[] {
    return permissions.map((permission) =>
      this.permissionsRepository.create({
        sectorCode: permission.sectorCode ?? null,
        action: permission.action,
        isAllowed: permission.isAllowed ?? true,
      }),
    );
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      permissions: (user.permissions ?? []).map((permission) => ({
        sectorCode: permission.sectorCode,
        action: permission.action,
        isAllowed: permission.isAllowed,
      })),
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

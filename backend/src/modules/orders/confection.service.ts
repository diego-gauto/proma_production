import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorCode } from '../catalog/entities/catalog.enums';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { User } from '../users/entities/user.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { AssignConfectionDto, RegisterConfectionDeliveryDto, SendConfectionDto } from './dto/order.dto';
import { ConfectionAssignment } from './entities/confection-assignment.entity';
import { ConfectionDelivery } from './entities/confection-delivery.entity';
import { ConfectionAssignmentStatus } from './entities/confection.enums';
import { OrderPart } from './entities/order-part.entity';

@Injectable()
export class ConfectionService {
  constructor(
    @InjectRepository(OrderPart) private readonly parts: Repository<OrderPart>,
    @InjectRepository(ConfectionAssignment) private readonly assignments: Repository<ConfectionAssignment>,
    @InjectRepository(ConfectionDelivery) private readonly deliveries: Repository<ConfectionDelivery>,
    @InjectRepository(Workshop) private readonly workshops: Repository<Workshop>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  async assign(partId: string, dto: AssignConfectionDto, user: AuthenticatedUser): Promise<ConfectionAssignment> {
    this.ensurePermission(user);
    const [part, workshop, assignedBy] = await Promise.all([this.parts.findOne({ where: { id: partId }, relations: { events: { stage: true }, cutLoads: { items: true } } }), this.workshops.findOneBy({ id: dto.workshopId }), this.users.findOneBy({ id: user.id })]);
    if (!part) throw new NotFoundException('Parte no encontrada');
    if (!workshop) throw new NotFoundException('Taller no encontrado');
    const cutQuantity = (part.cutLoads ?? []).flatMap((load) => load.items ?? []).reduce((total, item) => total + item.quantity, 0);
    if (cutQuantity <= 0) throw new BadRequestException('La parte solo puede asignarse cuando existe corte registrado');
    const existing = await this.assignments.findOne({ where: { orderPart: { id: partId }, status: ConfectionAssignmentStatus.ASIGNADO } });
    if (existing) throw new ConflictException('La parte ya tiene un taller asignado');
    return this.assignments.save(this.assignments.create({ orderPart: part, workshop, quantity: (part.cutLoads ?? []).flatMap((load) => load.items ?? []).reduce((total, item) => total + item.quantity, 0), deliveredQuantity: 0, status: ConfectionAssignmentStatus.ASIGNADO, assignedBy: assignedBy!, assignedAt: new Date(), note: dto.note ?? null }));
  }
  async send(id: string, dto: SendConfectionDto, user: AuthenticatedUser): Promise<ConfectionAssignment> {
    this.ensurePermission(user); const assignment = await this.findAssignment(id);
    if (assignment.status !== ConfectionAssignmentStatus.ASIGNADO) throw new ConflictException('Solo se puede enviar una asignación pendiente');
    assignment.status = ConfectionAssignmentStatus.EN_CONFECCION; assignment.sentAt = new Date(); assignment.note = dto.note ?? assignment.note ?? null;
    return this.assignments.save(assignment);
  }
  async registerDelivery(id: string, dto: RegisterConfectionDeliveryDto, user: AuthenticatedUser): Promise<ConfectionAssignment> {
    this.ensurePermission(user); const assignment = await this.findAssignment(id);
    if (![ConfectionAssignmentStatus.EN_CONFECCION, ConfectionAssignmentStatus.ASIGNADO].includes(assignment.status)) throw new ConflictException('La asignación no está en confección');
    const total = assignment.deliveredQuantity + dto.quantity;
    if (total > assignment.quantity) throw new ConflictException('La entrega supera la cantidad asignada');
    const registeredBy = await this.users.findOneBy({ id: user.id });
    await this.deliveries.save(this.deliveries.create({ assignment, quantity: dto.quantity, deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : new Date(), note: dto.note ?? null, registeredBy: registeredBy! }));
    assignment.deliveredQuantity = total; assignment.status = total === assignment.quantity ? ConfectionAssignmentStatus.TERMINADO : ConfectionAssignmentStatus.EN_CONFECCION;
    if (assignment.status === ConfectionAssignmentStatus.TERMINADO) assignment.finishedAt = new Date();
    return this.assignments.save(assignment);
  }
  private async findAssignment(id: string): Promise<ConfectionAssignment> { const found = await this.assignments.findOne({ where: { id }, relations: { orderPart: true, workshop: true, deliveries: true } }); if (!found) throw new NotFoundException('Asignación de confección no encontrada'); return found; }
  private ensurePermission(user: AuthenticatedUser): void { if (user.role === UserRole.ADMIN) return; if ((user.permissions ?? []).some((p) => p.isAllowed && p.action === PermissionAction.EDITAR && (p.sectorCode === SectorCode.CONFECCION || p.sectorCode === null))) return; throw new ForbiddenException('No tenes permisos para gestionar Confección'); }
}

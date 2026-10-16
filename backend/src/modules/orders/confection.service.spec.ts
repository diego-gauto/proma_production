import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfectionService } from './confection.service';
import { ConfectionAssignmentStatus } from './entities/confection.enums';

describe('ConfectionService', () => {
  const parts = { findOne: jest.fn() };
  const assignments = { findOne: jest.fn(), create: jest.fn((value) => value), save: jest.fn() };
  const deliveries = { create: jest.fn((value) => value), save: jest.fn() };
  const workshops = { findOne: jest.fn(), findOneBy: jest.fn() };
  const users = { findOneBy: jest.fn() };
  const stages = { findOneBy: jest.fn() };
  const events = { find: jest.fn(), findOne: jest.fn() };

  const service = new ConfectionService(
    parts as never,
    assignments as never,
    deliveries as never,
    workshops as never,
    users as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects assignment when cutting is not finished', async () => {
    parts.findOne.mockResolvedValue({ id: 'part-1', quantity: 10, events: [] }); workshops.findOneBy.mockResolvedValue({ id: 'workshop-1' });

    await expect(service.assign('part-1', { workshopId: 'workshop-1' }, { id: 'user-1', role: 'ADMIN' } as never))
      .rejects.toThrow(BadRequestException);
  });

  it('assigns a cut to a workshop before it is sent', async () => {
    parts.findOne.mockResolvedValue({ id: 'part-1', quantity: 10, events: [
      { stage: { code: 'CORTE' }, finishedAt: new Date() },
    ], cutLoads: [{ items: [{ quantity: 10 }] }] });
    assignments.findOne.mockResolvedValue(null);
    workshops.findOneBy.mockResolvedValue({ id: 'workshop-1' });
    users.findOneBy.mockResolvedValue({ id: 'user-1' });
    assignments.save.mockImplementation(async (value) => ({ id: 'assignment-1', ...value }));

    const result = await service.assign('part-1', { workshopId: 'workshop-1' }, { id: 'user-1', role: 'ADMIN' } as never);

    expect(result.status).toBe(ConfectionAssignmentStatus.ASIGNADO);
    expect(result.workshop.id).toBe('workshop-1');
  });

  it('keeps a partial delivery in confection and closes on the final delivery', async () => {
    const assignment = {
      id: 'assignment-1',
      status: ConfectionAssignmentStatus.EN_CONFECCION,
      quantity: 10,
      deliveredQuantity: 4,
      deliveries: [],
    };
    assignments.findOne.mockResolvedValue(assignment);
    users.findOneBy.mockResolvedValue({ id: 'user-1' });
    deliveries.save.mockImplementation(async (value) => value);
    assignments.save.mockImplementation(async (value) => value);

    const partial = await service.registerDelivery('assignment-1', { quantity: 3 }, { id: 'user-1', role: 'ADMIN' } as never);
    expect(partial.status).toBe(ConfectionAssignmentStatus.EN_CONFECCION);
    expect(partial.deliveredQuantity).toBe(7);

    const completedAssignment = { ...assignment, deliveredQuantity: 7 };
    assignments.findOne.mockResolvedValue(completedAssignment);
    const completed = await service.registerDelivery('assignment-1', { quantity: 3 }, { id: 'user-1', role: 'ADMIN' } as never);
    expect(completed.status).toBe(ConfectionAssignmentStatus.TERMINADO);
    expect(completed.deliveredQuantity).toBe(10);
  });

  it('rejects deliveries that exceed the assigned quantity', async () => {
    assignments.findOne.mockResolvedValue({
      id: 'assignment-1', status: ConfectionAssignmentStatus.EN_CONFECCION,
      quantity: 10, deliveredQuantity: 9, deliveries: [],
    });

    await expect(service.registerDelivery('assignment-1', { quantity: 2 }, { id: 'user-1', role: 'ADMIN' } as never))
      .rejects.toThrow(ConflictException);
  });
});

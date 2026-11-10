import { DomainEvent } from './domain-event.interface';

export abstract class AggregateRoot {
  private readonly domainEvents: DomainEvent[] = [];

  private version = 0;

  private persistedVersion = 0;

  protected record(
    factory: (
      aggregateVersion: number,
    ) => DomainEvent,
  ): void {
    const nextVersion = this.version + 1;

    const event = factory(
      nextVersion,
    );

    this.version = nextVersion;

    this.domainEvents.push(event);
  }

  getVersion(): number {
    return this.version;
  }

  getExpectedVersion(): number {
    return this.persistedVersion;
  }

  markPersisted(): void {
    this.persistedVersion = this.version;
  }

  getDomainEvents(): readonly DomainEvent[] {
    return [...this.domainEvents];
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];

    this.domainEvents.length = 0;

    return events;
  }

  protected restoreVersion(
    version: number,
  ): void {
    this.version = version;
    this.persistedVersion = version;
  }

  protected advanceVersion(): void {
    this.version += 1;
  }
}
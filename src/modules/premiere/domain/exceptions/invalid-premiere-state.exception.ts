export class InvalidPremiereStateException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPremiereStateException';
  }
}

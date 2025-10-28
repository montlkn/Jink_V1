declare namespace jest {
  // Extend as needed for stricter typing later.
  type DoneCallback = (reason?: string | Error) => void;
}

declare const expect: any;
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: (done?: jest.DoneCallback) => void): void;
declare function it(name: string, fn: (done?: jest.DoneCallback) => void): void;
declare function beforeAll(fn: (done?: jest.DoneCallback) => void): void;
declare function afterAll(fn: (done?: jest.DoneCallback) => void): void;
declare function beforeEach(fn: (done?: jest.DoneCallback) => void): void;
declare function afterEach(fn: (done?: jest.DoneCallback) => void): void;

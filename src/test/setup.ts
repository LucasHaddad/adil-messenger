import 'reflect-metadata';

jest.setTimeout(30000);

global.console = {
  ...console,
};

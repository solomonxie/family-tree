import { setStoreRegion, storeRegion } from './store-region';

it('is us unless the build says cn', () => {
  expect(storeRegion()).toBe('us');
  setStoreRegion('cn');
  expect(storeRegion()).toBe('cn');
  setStoreRegion('bogus');
  expect(storeRegion()).toBe('us');
});

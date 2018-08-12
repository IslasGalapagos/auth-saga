const auth = require('./saga.js');

const EXPIRED_DATE = Date.now();
const NOT_EXPIRED_DATE = new Date('3000').getTime();
const TOKEN = 'abc123';
const USER_NAME = 'Pythagoras';
const USER_PWD = 'mybirthdaydate';

test('auth by ls token', () => {
  const generator = auth();

  // get data from localstorage
  testGetTokenFromLS(generator);

  // return data from localstorage
  const lsData = generator.next({
    token: TOKEN,
    expiredDate: NOT_EXPIRED_DATE
  }).value;

  // put token to state
  expect(lsData.PUT).toBeTruthy();
  expect(lsData.PUT.action).toEqual({
    type: 'LOGIN_SUCCESS',
    token: TOKEN
  });

  testLogoutLoginLoop(generator);
});

test('auth by expired ls token', () => {
  const generator = auth();

  // get data from localstorage
  testGetTokenFromLS(generator);

  // return data from localstorage
  testLoginAction(generator, {
    token: TOKEN,
    expiredDate: EXPIRED_DATE
  });
  testReqToAPI(generator, {
    name: USER_NAME,
    password: USER_PWD
  });
  testResFromAPI(generator, TOKEN);

  const setLSToken = generator.next(TOKEN).value;
  expect(setLSToken.CALL).toBeTruthy();
  expect(setLSToken.CALL.args[0]).toEqual({token: TOKEN});

  testLogoutLoginLoop(generator);
});

test('auth by correct user data', () => {
  const generator = auth();

  // get data from localstorage
  testGetTokenFromLS(generator);

  testLoginAction(generator);
  testReqToAPI(generator, {
    name: USER_NAME,
    password: USER_PWD
  });
  testResFromAPI(generator, TOKEN);

  const setLSToken = generator.next(TOKEN).value;
  expect(setLSToken.CALL).toBeTruthy();
  expect(setLSToken.CALL.args[0]).toEqual({token: TOKEN});

  testLogoutLoginLoop(generator);
});

test('auth by wrong user data', () => {
  const generator = auth();

  // get data from localstorage
  testGetTokenFromLS(generator);

  testLoginAction(generator);
  testReqToAPI(generator, {
    name: 'Euclid',
    password: 'mycatbirthdaydate'
  });

  testResFromAPI(generator, new Error());

  testLoginAction(generator);
  testReqToAPI(generator, {
    name: USER_NAME,
    password: USER_PWD
  });
  testResFromAPI(generator);
});

function testGetTokenFromLS(generator, value) {
  const call = generator.next(value).value;

  expect(call.CALL).toBeTruthy();
  expect(call.CALL.args[0]).toEqual(['token', 'expiredDate']);
}

function testLoginAction(generator, value) {
  const loginAction = generator.next(value).value;

  expect(loginAction.TAKE).toBeTruthy();
  expect(loginAction.TAKE.pattern).toBe('LOGIN');
}

function testReqToAPI(generator, value) {
  const reqToAPI = generator.next(value).value;

  expect(reqToAPI.CALL).toBeTruthy();
  expect(reqToAPI.CALL.args[0]).toEqual(['/api/login', value]);
}

function testResFromAPI(generator, value) {
  if (value instanceof Error) {
    const respFromAPI = generator.throw(value).value;
    expect(respFromAPI.PUT).toBeTruthy();
    expect(respFromAPI.PUT.action).toEqual({
      type: 'LOGIN_ERROR',
      error: value
    });

    return;
  }

  const respFromAPI = generator.next(value).value;
  expect(respFromAPI.PUT).toBeTruthy();
  expect(respFromAPI.PUT.action).toEqual({
    type: 'LOGIN_SUCCESS',
    token: value
  });
}

function testLogoutAction(generator, value) {
  const logoutAction = generator.next(value).value;
  expect(logoutAction.TAKE).toBeTruthy();
  expect(logoutAction.TAKE.pattern).toBe('LOGOUT');

  const removeLSToken = generator.next().value;
  expect(removeLSToken.CALL).toBeTruthy();
  expect(removeLSToken.CALL.args[0]).toEqual(['token', 'expiredDate']);
}

function testLogoutLoginLoop(generator) {
  for (let i = 0; i < 2; i += 1) {
    // logout action
    testLogoutAction(generator);

    // login after logout
    testLoginAction(generator);
    testReqToAPI(generator, {
      name: USER_NAME,
      password: USER_PWD
    });
    testResFromAPI(generator, TOKEN);
  }
}

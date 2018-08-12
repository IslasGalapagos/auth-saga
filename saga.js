const {call, put, take} = require('redux-saga/effects');

function* putLogin(token) {
  yield put({
    type: 'LOGIN_SUCCESS',
    token: token
  });
}

function* login() {
  const userData = yield take('LOGIN');

  try {
    const token = yield call(() => {}, ['/api/login', userData]);
    yield* putLogin(token);

    return token;
  } catch (err) {
    yield put({
      type: 'LOGIN_ERROR',
      error: err
    });

    yield* login();
  }
}

function* auth() {
  const tokenData = yield call(() => {}, ['token', 'expiredDate']);

  if (tokenData && tokenData.expiredDate > Date.now()) {
    yield* putLogin(tokenData.token);
  } else {
    const token = yield* login();
    yield call(() => {}, {token: token});
  }

  while (true) {
    yield take('LOGOUT');
    yield call(() => {}, ['token', 'expiredDate']);
    yield* login();
  }
}

module.exports = auth;

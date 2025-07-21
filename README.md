# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

<img width="907" height="358" alt="873bb7c8cfaef9bce1a8d7aeb0755391a05fc500" src="https://github.com/user-attachments/assets/d7369568-c9be-4a47-9627-d29fa82630b2" />
<table border="1" cellpadding="6" cellspacing="0">
  <thead>
    <tr>
      <th>Пин CC1101 V2</th>
      <th>Назначение</th>
      <th>Подключение к Arduino UNO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>VCC</td>
      <td>Питание</td>
      <td>3.3V <strong>(НЕ 5V!)</strong></td>
    </tr>
    <tr>
      <td>GND</td>
      <td>Земля</td>
      <td>GND</td>
    </tr>
    <tr>
      <td>CSN / CS / NSS</td>
      <td>SPI Chip Select</td>
      <td>D10</td>
    </tr>
    <tr>
      <td>SCK</td>
      <td>SPI Clock</td>
      <td>D13</td>
    </tr>
    <tr>
      <td>MOSI / SI</td>
      <td>SPI Master Out</td>
      <td>D11</td>
    </tr>
    <tr>
      <td>MISO / SO</td>
      <td>SPI Master In</td>
      <td>D12</td>
    </tr>
    <tr>
      <td>GDO0</td>
      <td>Прерывание / выход</td>
      <td>D2 (или другой свободный)</td>
    </tr>
    <tr>
      <td>GDO2</td>
      <td>Необязательный</td>
      <td>Не подключать</td>
    </tr>
  </tbody>
</table>



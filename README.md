# United noncustodial swap - FrontEnd Installers

This project developing with Vue 3 in Vite.

## DNS & URL

| External URL                  | GitLab Deployment Trigger | Firebase URL                                     |
| ----------------------------- | ------------------------- | ------------------------------------------------ |
| `https://swap.united.network` | `merge_request`           | `https://united-noncustodial-swap-front.web.app` |

## Project Structure

Folders:

- `vite.config.js` - Vue configuration
- `src/` - Sources code
- `public/` - Build artifacts

## Project Setup

### Configure to Google Firebase

```sh
make init
```

### Run Local Development Version

This command will run `development` code from `src` folder

```sh
make dev
```

### Lint Code with [ESLint](https://eslint.org/)

```sh
make lint
```

### Compile and Minify for Deployment

```sh
make build
```

### Run Local Built Version

This command will run `built` code from `public` folder

```sh
make run
```

### Deploy to Google Firebase

```sh
make deploy
```

By default `frontend-installers` deployed into Google project `united-noncustodial-swap-front`. To deploy into Google project `united-noncustodial-swap-front`

```sh
export google_project=united-noncustodial-swap-front
make settings
make deploy
```

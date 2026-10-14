// the global guards
const globalGuards = ['cardRegistered']

// the guards
const guards = resolveGuards(
	import.meta.glob('@/router/middleware/*.js', { eager: true })
)

/**
 * Resolve the guards
 *
 * @param   {Object}  files
 *
 * @return  {Array}
 */
function resolveGuards (files) {
	return Object.keys(files).map(file =>
		[file.replace(/(.+)\/([^\/]+)\/|(^.\/)|(\.js$)/g, ''), files[file].default]
	).reduce((guards, [name, guard]) => (
		{ ...guards, [name]: guard }
	), {})
}

/**
 * Parse the guards to a list
 *
 * @param   {Object}  files
 *
 * @return  {Array}
 */
function parseGuards (guard) {
	if (typeof guard === 'function') {
		return { guard }
	}

	const [name, params] = guard.split(':')

	return { guard: name, params }
}

/**
 * Call the guards for a specific route
 *
 * @param   {Object}  files
 *
 * @return  {Array}
 */
export function callGuards (list, to, from, next) {
	const stack = list.reverse()

	const _next = (...args) => {
		// Stop if "_next" was called with an argument or the stack is empty.
		if (args.length > 0 || stack.length === 0) {
			return next(...args)
		}

		const { guard, params } = parseGuards(stack.pop())

		if (typeof guard === 'function') {
			guard(to, from, _next, params)
		} else if (guards[guard]) {
			guards[guard](to, from, _next, params)
		} else {
			throw Error(`Undefined guard [${guard}]`)
		}
	}

	_next()
}

/**
 * Merge the the global middleware with the components middleware.
 *
 * @param  {Array} components
 * @return {Array}
 */
export function getGuards (components) {
	const guardList = [...globalGuards]
	
	components.forEach(c => {
		if (Array.isArray(c.components.default.guards)) {
			guardList.push(...c.components.default.guards)
		} else if (c.components.default.guards) {
			guardList.push(c.components.default.guards)
		}
	})

	return guardList
}
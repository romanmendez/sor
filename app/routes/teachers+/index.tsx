import { invariantResponse } from '@epic-web/invariant'
import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc, useDelayedIsPending } from '#app/utils/misc.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const searchTerm = new URL(request.url).searchParams.get('search')
	if (searchTerm === '') {
		return redirect('/teachers')
	}

	const like = `%${searchTerm ?? ''}%`
	const teachers = await prisma.teacher.findMany({
		select: {
			id: true,
			userId: true,
			name: true,
			instruments: true,
			user: {
				select: {
					image: true,
				},
			},
		},
		where: {
			name: { contains: like },
		},
	})

	invariantResponse(teachers, 'Teachers not found', { status: 404 })

	return json({ status: 'idle', teachers } as const)
}

export default function TeachersRoute() {
	const data = useLoaderData<typeof loader>()
	const formAction = '/teachers'
	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction,
	})

	return (
		<div className="container mb-48 mt-5 flex flex-col items-center justify-center gap-6">
			<div className="w-full max-w-[700px] ">
				<SearchBar
					status={data.status}
					formAction={formAction}
					autoFocus
					autoSubmit
				/>
			</div>
			<main>
				{data.status === 'idle' ? (
					data.teachers.length ? (
						<ul
							className={cn(
								'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
								{ 'opacity-50': isPending },
							)}
						>
							{data.teachers.map(teacher => (
								<li key={teacher.id}>
									<Link
										to={teacher.id}
										className="flex h-36 w-44 flex-col items-center justify-center rounded-lg bg-muted px-5 py-3"
									>
										<img
											alt={teacher.name}
											src={getUserImgSrc(teacher.user?.image?.id)}
											className="h-16 w-16 rounded-full"
										/>
										<span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-body-md">
											{teacher.name}
										</span>
										<span className="w-full overflow-hidden whitespace-nowrap text-center text-body-sm text-muted-foreground">
											{teacher.instruments}
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p>No teachers found</p>
					)
				) : data.status === 'error' ? (
					<ErrorList errors={['There was an error parsing the results']} />
				) : null}
			</main>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}

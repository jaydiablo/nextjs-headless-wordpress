import Layout from "../src/components/layout";
import client from "../src/apollo/client";
import { GET_PAGE } from "../src/queries/pages/get-page";
import { GET_PAGES } from "../src/queries/pages/get-pages";
import { sanitize } from "../src/utils/functions";
import { useRouter } from "next/router";
import { customPagesSlugs } from "../src/utils/slugs";

const Page = ({ data }) => {
    const router = useRouter();
    const { page } = data;

    return (
        <Layout data={data}>
            <div>
                <h1 dangerouslySetInnerHTML={{ __html: sanitize(page?.title) }} />
                <div dangerouslySetInnerHTML={{ __html: sanitize(page?.content) }} />
            </div>
        </Layout>
    );
};

export default Page;

export async function getStaticProps({ params }) {
    const { data } = await client.query({
        query: GET_PAGE,
        variables: {
            uri: params?.slug.join("/"),
        },
    });

    return {
        props: {
	        data:  {
		        menus: {
			        headerMenus: data?.headerMenus?.edges || [],
			        footerMenus: data?.footerMenus?.edges || []
		        },
		        page: data?.page ?? {},
		        path: params?.slug.join("/"),
	        }
        },
	    /**
	     * Revalidate means that if a new request comes to server, then every 1 sec it will check
	     * if the data is changed, if it is changed then it will update the
	     * static file inside .next folder with the new data, so that any 'SUBSEQUENT' requests should have updated data.
	     */
        revalidate: 1,
    };
}

/**
 * Since the page name uses catch-all routes,
 * for example [...slug],
 * that's why params would contain slug which is an array.
 * For example, If we need to have dynamic route '/foo/bar'
 * Then we would add paths: [ params: { slug: ['foo', 'bar'] } } ]
 * Here slug will be an array is ['foo', 'bar'], then Next.js will statically generate the page at /foo/bar
 *
 * At build time next js will will make an api call get the data and
 * generate a page bar.js inside .next/foo directory, so when the page is served on browser
 * data is already present, unlike getInitialProps which gets the page at build time but makes an api
 * call after page is served on the browser.
 *
 * @see https://nextjs.org/docs/basic-features/data-fetching#the-paths-key-required
 *
 * @returns {Promise<{paths: [], fallback: boolean}>}
 */
export async function getStaticPaths () {
	const { data } = await client.query({
		query: GET_PAGES
	})

	const pathsData = [];

	(data?.pages?.nodes ?? []).map((page) => {
		/**
		 * Check if slug existsing and exclude the custom pages, from dynamic pages creation
		 * as they will automatically be generated when we create their respective directories
		 * with their names under 'pages'.
		 */
		if ( page?.slug && !customPagesSlugs.includes(page?.slug)) {
			pathsData.push({ params: { slug: [page?.slug] } })
		}
	})

	return {
		paths: pathsData,
		fallback: false
	}
}

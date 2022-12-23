import {NavigationProp} from "@react-navigation/native";
import {SQLResultSet} from "expo-sqlite";
import {Alert} from "react-native";
import {CombinedFileResultType, QueryFilter, SQLBoolean} from "../types/database";
import {del, executeQuery, update} from "./database.util";
import {deleteFile} from "./file.util";

export interface HomePageData {
	recentlyAdded: CombinedFileResultType;
	starred: CombinedFileResultType;
	continueReading: CombinedFileResultType;
}

export class RedaService {
	private static readonly query = executeQuery;

	private static readonly fetchQueryFields =
	  `f.id, f.name, f.path, f.size, f.has_started, f.has_finished, f.is_downloaded, f.is_starred, m.image, m.description, m.author, m.table_of_contents, m.subjects, m.first_publish_year, m.chapters, m.current_page, m.total_pages, m.created_at, m.updated_at`;

	static generateCurrentTimestamp(): string {
		const date = new Date();
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const hours = date.getHours() >= 10 ? date.getHours() : `0${date.getHours()}`;
		const minutes = date.getMinutes() >= 10 ? date.getMinutes() : `0${date.getMinutes()}`;
		const seconds = date.getSeconds() >= 10 ? date.getSeconds() : `0${date.getSeconds()}`;

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
	}

	static async count(): Promise<number> {
		const query = `SELECT COUNT(*) as count
                       FROM files;`;
		const result = (await this.query(query)) as SQLResultSet | null;
		return result?.rows._array[0].count || 0;
	}

	static extractResults(data: SQLResultSet | null): CombinedFileResultType[] {
		return data?.rows._array || ([] as any[])
	}

	static async loadHomePageData() {
		const [recentlyAdded, starred, continueReading] = await Promise.all([
			RedaService.getAll(),
			RedaService.getStarred(),
			RedaService.getContinueReading(),
		]);

		return {recentlyAdded, starred, continueReading};
	}

	static async getOne(id: number): Promise<CombinedFileResultType | null> {
		const query = `SELECT ${this.fetchQueryFields}
                       FROM files f
                                INNER JOIN metadata m
                                           ON f.id = m.file_id
                       WHERE f.id = ?;`;
		const result = (await this.query(query, [id])) as SQLResultSet | null;
		const res = result?.rows._array || ([] as any[]);
		return res[0];
	}

	static async getAll(
	  filter: QueryFilter = {
		  limit: 25,
		  sort_by: "created_at",
		  sort_order: "DESC",
	  },
	): Promise<CombinedFileResultType[]> {
		const {limit, sort_by, sort_order} = filter;

		const query = `SELECT ${this.fetchQueryFields}
                       FROM files f
                                INNER JOIN metadata m
                                           ON f.id = m.file_id
                       ORDER BY f.${sort_by} ${sort_order}
                       LIMIT ?;`;

		const result = (await this.query(query, [limit])) as SQLResultSet | null;
		return this.extractResults(result);
	}

	static async getStarred(
	  filter: QueryFilter = {limit: 25, sort_by: "updated_at", sort_order: "DESC"},
	): Promise<CombinedFileResultType[] | null> {
		const {limit, sort_by, sort_order} = filter;

		const query = `SELECT ${this.fetchQueryFields}
                       FROM files f
                                INNER JOIN metadata m
                                           ON f.id = m.file_id
                       WHERE f.is_starred = 1
                       ORDER BY m.${sort_by} ${sort_order}
                       LIMIT ?;`;
		const result = (await this.query(query, [limit])) as SQLResultSet | null;
		return this.extractResults(result);
	}

	static async getContinueReading(
	  filter: QueryFilter = {
		  limit: 25,
		  sort_by: "updated_at",
		  sort_order: "DESC",
	  },
	): Promise<CombinedFileResultType[]> {
		const {limit, sort_by, sort_order} = filter;

		const query = `SELECT ${this.fetchQueryFields}
                       FROM files f
                                INNER JOIN metadata m
                                           ON f.id = m.file_id
                       WHERE has_started = 1
                       ORDER BY m.${sort_by} ${sort_order}
                       LIMIT ?;`;

		const result = (await this.query(query, [limit])) as SQLResultSet | null;
		return this.extractResults(result);
	}

	static async toggleStar(id: number): Promise<void> {
		const query = `UPDATE files
                       SET is_starred = NOT is_starred
                       WHERE id = ?;`;
		await Promise.all([this.query(query, [id]), update({table: "metadata", identifier: "file_id"}, id, {
			updated_at: RedaService.generateCurrentTimestamp(),
		})]);
	}

	static async updateTotalPagesOnLoad(id: number, totalPageNumber: number) {
		try {
			const file = await RedaService.getOne(id);
			if (!file) return;
			if (file.total_pages == totalPageNumber) return;
			await update({table: "metadata", identifier: "file_id"}, id, {
				total_pages: totalPageNumber,
			});
		}
		catch (err) {
			Alert.alert(
			  "Error",
			  "Something went wrong! Close the app and try again.",
			);
		}
	}

	static async saveCurrentPage(id: number, currentPageNumber: number) {
		try {
			const file = await RedaService.getOne(id);
			if (!file) return;
			if (
			  file.current_page > file.total_pages ||
			  file.current_page > currentPageNumber ||
			  file?.has_finished == 1
			)
				return;
			if (!file.has_started && currentPageNumber > 1) {
				await update({table: "files", identifier: "id"}, id, {
					has_started: SQLBoolean.TRUE,
				});
			}
			await update({table: "metadata", identifier: "file_id"}, id, {
				current_page: currentPageNumber,
				updated_at: RedaService.generateCurrentTimestamp(),
			});
		}
		catch (err: unknown) {
			Alert.alert("Error", "Something went wrong. Close the app and try again.");
		}
	}

	static async deleteFile(id: number, navigation: NavigationProp<any>) {
		const file = await RedaService.getOne(id);
		if (!file) return;
		Alert.alert(
		  "Confirm",
		  `Are you sure you want to delete ${file?.name || ""}?`,
		  [
			  {text: "Cancel", style: "cancel"},
			  {
				  text: "Confirm",
				  style: "destructive",
				  onPress: () => {
					  Promise.all([
							del({table: "metadata", identifier: "file_id", id: file.id}),
							del({table: "files", identifier: "id", id: file.id}),
							deleteFile(file.path),
						])
						.then(() => navigation.goBack())
						.catch((e) => Alert.alert("Error", "Failed to delete!"));
				  },
			  },
		  ],
		);
	}

	static async search(
	  keyword: string,
	  filter: QueryFilter = {
		  limit: 100,
		  sort_by: "created_at",
		  sort_order: "ASC",
	  },
	): Promise<CombinedFileResultType[]> {
		const {limit, sort_by, sort_order} = filter;

		const query = `SELECT f.id,
                              f.name,
                              f.path,
                              f.size,
                              f.has_started,
                              f.has_finished,
                              f.is_downloaded,
                              f.is_starred,
                              f.created_at,
                              m.image,
                              m.description,
                              m.author,
                              m.table_of_contents,
                              m.subjects,
                              m.first_publish_year,
                              m.chapters,
                              m.current_page,
                              m.total_pages
                       FROM files f
                                INNER JOIN metadata m
                                           ON f.id = m.file_id
                       WHERE f.name LIKE ?
                       ORDER BY f.${sort_by} ${sort_order}
                       LIMIT ?;`;

		const result = (await this.query(query, [
			`%${keyword}%`,
			limit,
		])) as SQLResultSet | null;
		const res = result?.rows._array || ([] as any[]);
		res.map((item: any) => {
			item.table_of_contents =
			  item?.table_of_contents == "[]"
				? []
				: JSON.parse(item.table_of_contents);
		});
		return res;
	}
}
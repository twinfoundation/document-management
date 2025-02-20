// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@twin.org/api-models";
import {
	generateRestRoutesDocumentManagement,
	tagsDocumentManagement
} from "./documentManagementRoutes";

export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "documents",
		defaultBaseRoute: "documents",
		tags: tagsDocumentManagement,
		generateRoutes: generateRestRoutesDocumentManagement
	}
];

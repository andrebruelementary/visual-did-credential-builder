package com.elementarysoftware.prism.jobs;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import com.elementarysoftware.prism.DID;

import publishDid.PrismNodePublishAction;

public class PublishDIDToBlockchain {

	private DID did;

	public PublishDIDToBlockchain(DID d) {
		did = d;
	}

	private ExecutorService executor = Executors.newSingleThreadExecutor();

	public Future<DID> publishDID() {
		return executor.submit(() -> {
			String operationHash = PrismNodePublishAction.Companion.publishDid(did.getSeed());
			did.setLatestOperationHash(operationHash);
			return did;
		});
	}



}

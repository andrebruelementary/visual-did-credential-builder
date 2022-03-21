package com.elementarysoftware.prism;

import org.json.simple.JSONObject;

public class Credential {

	private Batch parentBatch;
	private String holder, hash, txid, network;
	
	public Credential(String holdername) {
		holder = holdername;
	}

	public void setHash(String credentialhash) {
		hash = credentialhash;	
	}

	public void setTxId(String transactionid) {
		txid = transactionid;
	}

	public void setNetwork(String networkname) {
		network = networkname;
	}

	public String getHolder() {
		return holder;
	}

	public String getHash() {
		return hash;
	}

	public String getTxid() {
		return txid;
	}

	public String getNetwork() {
		return network;
	}

	public void setPartOfBatch(Batch batch) {
		parentBatch = batch;
	}
	
	public Batch getBatch() {
		return parentBatch;
	}
	
	//JSONObject jsonObj = new JSONObject();
	
	//jsonObj.
	
}
